package com.iglesiadelacalle.sistemaiglesia.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.iglesiadelacalle.sistemaiglesia.models.Actividad; 

@Repository

public interface ActividadRepository extends JpaRepository<Actividad, Integer> {
}