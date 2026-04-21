package com.iglesiadelacalle.sistemaiglesia.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.iglesiadelacalle.sistemaiglesia.models.Ministerio;

@Repository
public interface MinisterioRepository extends JpaRepository<Ministerio, Integer> {
}