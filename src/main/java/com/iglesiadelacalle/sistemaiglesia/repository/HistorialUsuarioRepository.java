package com.iglesiadelacalle.sistemaiglesia.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.iglesiadelacalle.sistemaiglesia.models.HistorialUsuario;

@Repository
public interface HistorialUsuarioRepository extends JpaRepository<HistorialUsuario, Integer> {
}